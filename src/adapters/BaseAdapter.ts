import { CosmosClient, FeedOptions, SqlQuerySpec } from '@azure/cosmos'
import { CustomError } from '../models/CustomErrors'
import IDatabaseObject from '../models/DatabaseObject'
import { cosmos } from '../config.local.json'

const cosmosClient = new CosmosClient({
  endpoint: cosmos.cosmosEndpoint,
  key: cosmos.cosmosKey
})
const database = cosmosClient.database(cosmos.cosmosDatabase)
const container = database.container(cosmos.cosmosContainer)

export const BaseAdapter = {
  async Save (item: IDatabaseObject): Promise<any> {
    const { resource: createdItem } = await container.items.create(item)
    return createdItem
  },
  async Update (item: IDatabaseObject | any): Promise<IDatabaseObject> {
    const { resource: updatedItem } = await container
      .item(item.id, item.kind)
      .replace(item as any)
    return updatedItem
  },
  async Delete (item: IDatabaseObject): Promise<boolean> {
    await container.item(item.id!, item.kind).delete()
    return true
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
