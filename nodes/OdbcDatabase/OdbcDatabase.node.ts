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
      // ----------------------------------
      //         Operation Selection
      // ----------------------------------
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
          {
            name: 'Execute Procedure',
            value: 'executeProcedure',
            description: 'Call a stored procedure',
            action: 'Call a stored procedure',
          },
        ],
        default: 'executeQuery',
      },

      // ----------------------------------
      //         Execute Query Fields
      // ----------------------------------
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

      // ----------------------------------
      //       Execute Procedure Fields
      // ----------------------------------
      {
        displayName: 'Schema',
        name: 'schema',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['executeProcedure'],
          },
        },
        default: '',
        placeholder: 'PUBLIC',
        description: 'The schema of the stored procedure (optional for some DBs)',
      },
      {
        displayName: 'Procedure',
        name: 'procedure',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['executeProcedure'],
          },
        },
        default: '',
        placeholder: 'my_stored_proc',
        required: true,
        description: 'The name of the stored procedure',
      },
      {
        displayName: 'Arguments',
        name: 'arguments',
        placeholder: 'Add Argument',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
        },
        displayOptions: {
          show: {
            operation: ['executeProcedure'],
          },
        },
        default: {},
        options: [
          {
            name: 'argument',
            displayName: 'Argument',
            values: [
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'The value of the argument',
              },
              {
                displayName: 'Type',
                name: 'paramType',
                type: 'options',
                options: [
                  {
                    name: 'Input',
                    value: 'INPUT',
                  },
                  // Nota: ODBC gestisce OUTPUT parameters ma richiede gestione specifica nel driver.
                  // Spesso è meglio lasciare default INPUT o gestire null nel codice.
                  {
                    name: 'Output (Pass Null)',
                    value: 'OUTPUT',
                  },
                ],
                default: 'INPUT',
                description: 'Type of the parameter',
              },
            ],
          },
        ],
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
      const database = (credentials.database as string) || '*LOCAL';
      const username = credentials.username as string;
      const password = credentials.password as string;
      connectionString = `DRIVER={${driver}};SYSTEM=${host};DATABASE=${database};UID=${username};PWD=${password}`;
      
      const additionalOptions = credentials.additionalOptions as any;
      if (additionalOptions?.useSSL) connectionString += ';SECURITY=SSL';
      if (additionalOptions?.connectionTimeout) connectionString += `;CONNECTTIMEOUT=${additionalOptions.connectionTimeout}`;
    }

    let connection: odbc.Connection | null = null;

    try {
      connection = await odbc.connect(connectionString);

      for (let i = 0; i < items.length; i++) {
        try {
          if (operation === 'executeQuery') {
            // --- LOGICA QUERY STANDARD ---
            const query = this.getNodeParameter('query', i) as string;
            const result = await connection.query(query);

            if (Array.isArray(result)) {
              result.forEach((row: any) => {
                returnData.push({ json: row, pairedItem: { item: i } });
              });
            } else {
              returnData.push({ json: { success: true, result: result }, pairedItem: { item: i } });
            }

          } else if (operation === 'executeProcedure') {
            // --- LOGICA PROCEDURE ---
            const schemaRaw = this.getNodeParameter('schema', i) as string;
            const schema = schemaRaw?.trim() || null; // DB2 richiede null, non stringa vuota
            const procedure = this.getNodeParameter('procedure', i) as string;
            // Recuperiamo gli argomenti dalla fixed collection
            const argsNode = this.getNodeParameter('arguments.argument', i, []) as any[];

            // Mappiamo gli argomenti in un array semplice per ODBC
            const parameters = argsNode.map((arg: any) => {
              // Se è OUTPUT, spesso si passa null o undefined a seconda del driver
              if (arg.paramType === 'OUTPUT') return null;
              
              const val = arg.value;

              // Se il valore è una stringa vuota o solo spazi, lo manteniamo come stringa
              if (typeof val === 'string' && val.trim() === '') {
                  return val;
              }

              // Conversione numerica sicura: 
              // Convertiamo in numero solo se non è vuoto, non è null e la conversione restituisce un numero finito.
              if (val !== null && val !== '' && !isNaN(Number(val))) {
                  return Number(val);
              }
              
              return val;
            });

            // Eseguiamo la chiamata. 
            // Castiamo connection as 'any' per evitare errori TS se i tipi @types/odbc sono vecchi
            const result = await (connection as any).callProcedure(null, schema, procedure, parameters);

            // Se result è un array, probabilmente è un Result Set (righe)
            let rows = [];
            if (Array.isArray(result)) {
                rows = result;
            }

            returnData.push({
              json: {
                success: true,
                // Restituiamo tutto il risultato raw per vedere cosa c'è dentro
                result: result,
                rows: rows,
                outputParameters: result.parameters, 
                returnValue: result.return,
              },
              pairedItem: { item: i },
            });
          }

        } catch (error) {
          if (this.continueOnFail()) {
            returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
            continue;
          }
          throw error;
        }
      }
    } catch (error: any) {
      // Gestione errori ODBC estesa
      let errorDetails = '';
      if (error.odbcErrors && Array.isArray(error.odbcErrors)) {
          errorDetails = error.odbcErrors.map((e: any) => `[${e.code}/${e.state}] ${e.message}`).join(' | ');
      }
      throw new NodeOperationError(
        this.getNode(),
        `ODBC Error: ${error.message} \nDetails: ${errorDetails}`,
      );
    } finally {
      if (connection) {
        try { await connection.close(); } catch (e) {}
      }
    }

    return [returnData];
  }
}