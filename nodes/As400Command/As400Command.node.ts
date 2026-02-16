import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

import * as odbc from 'odbc';

export class As400Command implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'AS400 Command',
    name: 'as400Command',
    icon: 'file:AS400CommandIcon.svg',
    group: ['transform'],
    version: 1,
    description: 'Execute CL Commands on IBM i (AS400)',
    defaults: {
      name: 'AS400 Command',
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
        displayName: 'Command',
        name: 'command',
        type: 'string',
        default: '',
        placeholder: 'CRTLIB LIB(MYLIB)',
        description: 'The CL command to execute',
        required: true,
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('odbcDatabaseApi');

    // Build connection string (Reuse logic from OdbcDatabase)
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
          const command = this.getNodeParameter('command', i) as string;

          // QSYS2.QCMDEXC is the SQL procedure to execute CL commands.
          // It accepts the command string as the first parameter.
          // Example: CALL QSYS2.QCMDEXC('CRTLIB LIB(TESTLIB)')
          
          const query = `CALL QSYS2.QCMDEXC(?)`;
          
          // Execute the command
          await connection.query(query, [command]);

          returnData.push({
            json: {
              success: true,
              command: command,
              message: 'Command executed successfully'
            },
            pairedItem: { item: i },
          });

        } catch (error) {
          if (this.continueOnFail()) {
            returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
            continue;
          }
          throw error;
        }
      }
    } catch (error: any) {
        throw error;
    } finally {
        if (connection) {
            await connection.close();
        }
    }

    return [returnData];
  }
}
