import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
      throw new Error('Missing required Neo4j environment variables: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD');
    }

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
      maxConnectionPoolSize: process.env.NODE_ENV === 'production' ? 10 : 50,
      connectionAcquisitionTimeout: 10 * 1000, // 10 seconds
      connectionTimeout: 30 * 1000, // 30 seconds
    });
  }

  return driver;
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
