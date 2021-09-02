import { Container, CosmosClient, Database, FeedOptions, SqlQuerySpec } from '@azure/cosmos'
import { CustomError } from '../models/CustomErrors'
import IDatabaseObject from '../models/DatabaseObject'
import { CosmosSettings } from '../models/Settings'

const cosmosInfo: CosmosSettings = new CosmosSettings()
let database: Database
let container: Container
if (process.env.NODE_ENV === 'prod') {
  import('../config.json').then(config => {
    cosmosInfo.cosmosContainer = config.cosmos.cosmosContainer
    cosmosInfo.cosmosDatabase = config.cosmos.cosmosDatabase
    cosmosInfo.cosmosEndpoint = config.cosmos.cosmosEndpoint
    cosmosInfo.cosmosKey = config.cosmos.cosmosKey
  })
} else {
  import('../config.local.json').then(config => {
    cosmosInfo.cosmosContainer = config.cosmos.cosmosContainer
    cosmosInfo.cosmosDatabase = config.cosmos.cosmosDatabase
    cosmosInfo.cosmosEndpoint = config.cosmos.cosmosEndpoint
    cosmosInfo.cosmosKey = config.cosmos.cosmosKey
    const cosmosClient = new CosmosClient({
      endpoint: cosmosInfo.cosmosEndpoint,
      key: cosmosInfo.cosmosKey
    })
    database = cosmosClient.database(cosmosInfo.cosmosDatabase)
    container = database.container(cosmosInfo.cosmosContainer)
  })
}

export const BaseAdapter = {
  async Save<IDatabaseObject> (item: IDatabaseObject): Promise<any> {
    const { resource: createdItem } = await container.items.create(item)
    return createdItem
  },
  async Delete (item: IDatabaseObject): Promise<boolean> {
    await container.item(item.id!, item.kind).delete()
    return true
  },
  async Update (item: IDatabaseObject | any): Promise<IDatabaseObject> {
    const { resource: updatedItem } = await container
      .item(item.id, item.kind)
      .replace(item as any)
    return updatedItem
  },
  async Get (id: string, partitionKey: string): Promise<IDatabaseObject> {
    try {
      const { resource: currentItem } = await container.item(id, partitionKey).read()
      return currentItem
    } catch (err) {
      console.error(err)
      throw new CustomError('Could not get database.')
    }
  },
  async GetByValue (key: string, value: string, partitionKey: string): Promise<IDatabaseObject[]> {
    try {
      const querySpec = {
        query: `SELECT * FROM c WHERE c.${key} = @key`,
        parameters: [
          {
            name: '@key',
            value: value
          }
        ]
      }
      const queryOptions: FeedOptions = {
        partitionKey: partitionKey
      }
      const { resources: fetchedItems } = await container.items.query(querySpec, queryOptions).fetchAll()
      return fetchedItems
    } catch (err) {
      console.error(err)
      throw new CustomError('Could not get database.')
    }
  },
  async Query (querySpec: SqlQuerySpec, queryOptions: FeedOptions): Promise<IDatabaseObject[]> {
    try {
      const { resources: fetchedItems } = await container.items.query(querySpec, queryOptions).fetchAll()
      return fetchedItems
    } catch (err) {
      console.error(err)
      throw new CustomError('Could not get database.')
    }
  }
}
