import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OdbcDatabaseApi implements ICredentialType {
	name = 'odbcDatabaseApi';
	displayName = 'ODBC Database';
	documentationUrl = 'https://github.com/matti33011/n8n-nodes-odbc-database';
	properties: INodeProperties[] = [
		{
			displayName: 'Connection Type',
			name: 'connectionType',
			type: 'options',
			options: [
				{
					name: 'Connection String',
					value: 'connectionString',
					description: 'Use a full ODBC connection string',
				},
				{
					name: 'DSN',
					value: 'dsn',
					description: 'Use a configured DSN (Data Source Name)',
				},
				{
					name: 'Manual Configuration',
					value: 'manual',
					description: 'Specify host, port, database, etc.',
				},
			],
			default: 'manual',
			description: 'How to connect to your database',
		},
		{
			displayName: 'Connection String',
			name: 'connectionString',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					connectionType: ['connectionString'],
				},
			},
			default: '',
			placeholder: 'DRIVER={IBM i Access ODBC Driver 64-bit};SYSTEM=hostname;UID=user;PWD=password',
			description: 'Full ODBC connection string',
			required: true,
		},
		{
			displayName: 'DSN Name',
			name: 'dsn',
			type: 'string',
			displayOptions: {
				show: {
					connectionType: ['dsn'],
				},
			},
			default: '',
			placeholder: 'MyDatabaseDSN',
			description: 'Data Source Name configured in odbcinst.ini',
			required: true,
		},
		{
			displayName: 'Driver',
			name: 'driver',
			type: 'string',
			displayOptions: {
				show: {
					connectionType: ['manual'],
				},
			},
			default: 'IBM i Access ODBC Driver 64-bit',
			placeholder: 'IBM i Access ODBC Driver 64-bit',
			description: 'ODBC driver name (must match odbcinst.ini)',
			required: true,
		},
		{
			displayName: 'Host',
			name: 'host',
			type: 'string',
			displayOptions: {
				show: {
					connectionType: ['manual'],
				},
			},
			default: '',
			placeholder: 'hostname.example.com',
			description: 'Database server hostname or IP',
			required: true,
		},
		{
			displayName: 'Database',
			name: 'database',
			type: 'string',
			displayOptions: {
				show: {
					connectionType: ['manual'],
				},
			},
			default: '',
			placeholder: '*LOCAL',
			description: 'Database name (use *LOCAL for IBM i)',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			displayOptions: {
				show: {
					connectionType: ['dsn', 'manual'],
				},
			},
			default: '',
			description: 'Database username',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					connectionType: ['dsn', 'manual'],
				},
			},
			default: '',
			description: 'Database password',
			required: true,
		},
		{
			displayName: 'Additional Options',
			name: 'additionalOptions',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			options: [
				{
					displayName: 'Connection Timeout',
					name: 'connectionTimeout',
					type: 'number',
					default: 30,
					description: 'Connection timeout in seconds',
				},
				{
					displayName: 'Use SSL',
					name: 'useSSL',
					type: 'boolean',
					default: false,
					description: 'Whether to use SSL for the connection',
				},
			],
		},
	];
}
