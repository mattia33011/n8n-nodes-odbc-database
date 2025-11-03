import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import * as odbc from 'odbc';

export class OdbcDatabase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ODBC Database',
		name: 'odbcDatabase',
		icon: 'file:odbcDatabase.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Execute SQL queries on databases via ODBC',
		defaults: {
			name: 'ODBC Database',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'odbcDatabaseApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Execute Query',
						value: 'executeQuery',
						description: 'Execute an SQL query',
						action: 'Execute a SQL query',
					},
				],
				default: 'executeQuery',
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				displayOptions: {
					show: {
						operation: ['executeQuery'],
					},
				},
				default: '',
				placeholder: 'SELECT * FROM table WHERE id = 1',
				required: true,
				description: 'The SQL query to execute',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		// Get credentials
		const credentials = await this.getCredentials('odbcDatabaseApi');

		// Build connection string
		let connectionString = '';

		if (credentials.connectionType === 'connectionString') {
			connectionString = credentials.connectionString as string;
		} else if (credentials.connectionType === 'dsn') {
			connectionString = `DSN=${credentials.dsn};UID=${credentials.username};PWD=${credentials.password}`;
		} else if (credentials.connectionType === 'manual') {
			const driver = credentials.driver as string;
			const host = credentials.host as string;
			const database = credentials.database as string || '*LOCAL';
			const username = credentials.username as string;
			const password = credentials.password as string;

			connectionString = `DRIVER={${driver}};SYSTEM=${host};DATABASE=${database};UID=${username};PWD=${password}`;

			// Add additional options
			const additionalOptions = credentials.additionalOptions as any;
			if (additionalOptions?.useSSL) {
				connectionString += ';SECURITY=SSL';
			}
			if (additionalOptions?.connectionTimeout) {
				connectionString += `;CONNECTTIMEOUT=${additionalOptions.connectionTimeout}`;
			}
		}

		if (operation === 'executeQuery') {
			let connection: odbc.Connection | null = null;

			try {
				// Connect to database
				connection = await odbc.connect(connectionString);

				// Execute query for each item
				for (let i = 0; i < items.length; i++) {
					try {
						const query = this.getNodeParameter('query', i) as string;

						// Execute the query
						const result = await connection.query(query);

						// Return results
						if (Array.isArray(result)) {
							// SELECT query returns array of rows
							result.forEach((row: any) => {
								returnData.push({
									json: row,
									pairedItem: { item: i },
								});
							});
						} else {
							// INSERT/UPDATE/DELETE returns result object
							returnData.push({
								json: {
									success: true,
									result: result,
								},
								pairedItem: { item: i },
							});
						}
					} catch (error) {
						if (this.continueOnFail()) {
							returnData.push({
								json: {
									error: (error as Error).message,
								},
								pairedItem: { item: i },
							});
							continue;
						}
						throw error;
					}
				}
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					`Failed to execute query: ${(error as Error).message}`,
				);
			} finally {
				// Close connection
				if (connection) {
					try {
						await connection.close();
					} catch (error) {
						// Ignore close errors
					}
				}
			}
		}

		return [returnData];
	}
}
