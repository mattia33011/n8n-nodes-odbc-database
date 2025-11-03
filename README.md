# n8n-nodes-odbc-database

This is an n8n community node that lets you connect to databases using ODBC (Open Database Connectivity) in your n8n workflows.

Supports any database with ODBC drivers including:
- IBM i (AS/400)
- IBM DB2
- PostgreSQL
- MySQL
- SQL Server
- Oracle
- And many more

## Installation

### Community Nodes (Recommended)

For n8n cloud or self-hosted using npm:

1. Go to **Settings** → **Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-odbc-database`
4. Agree to the risks and install

### Manual Installation

```bash
npm install n8n-nodes-odbc-database
```

## Prerequisites

This node requires the ODBC driver for your database to be installed on the system where n8n is running.

### For IBM i (AS/400):
```bash
# Download and install IBM i Access ODBC Driver
# https://www.ibm.com/support/pages/ibm-i-access-client-solutions
```

### For Docker/Kubernetes:
You need to install the ODBC drivers in your container using init containers or a custom Docker image.

## Usage

### Credentials

Configure your database connection using one of three methods:

1. **Connection String**: Full ODBC connection string
   ```
   DRIVER={IBM i Access ODBC Driver 64-bit};SYSTEM=hostname;UID=user;PWD=password
   ```

2. **DSN**: Use a configured Data Source Name
   ```
   DSN=MyDatabase
   ```

3. **Manual Configuration**: Specify driver, host, database, username, and password individually

### Operations

- **Execute Query**: Run any SQL query (SELECT, INSERT, UPDATE, DELETE, etc.)

## Example Queries

```sql
-- Select data
SELECT * FROM customers WHERE id = 1

-- Insert data
INSERT INTO orders (customer_id, amount) VALUES (123, 99.99)

-- Update data
UPDATE products SET price = 29.99 WHERE sku = 'ABC123'

-- Delete data
DELETE FROM temp_data WHERE created_at < CURRENT_DATE - 30
```

## Compatibility

- Requires n8n version 0.198.0 or higher
- Requires ODBC drivers to be installed on the system
- Works with any database that has ODBC support

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [ODBC Wikipedia](https://en.wikipedia.org/wiki/Open_Database_Connectivity)

## License

MIT
