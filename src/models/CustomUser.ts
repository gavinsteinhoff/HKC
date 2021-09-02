import { FeedOptions, SqlQuerySpec } from '@azure/cosmos'
import { BaseAdapter } from '../adapters/BaseAdapter'
import IDatabaseObject from './DatabaseObject'

export default class CustomUser implements IDatabaseObject {
    id: string | undefined
    kind: string = 'guild'
    modLogChannel: string | undefined

    constructor (id: string) {
      this.id = id
    }

    static FromDatabase (databaseItem: any): CustomUser {
      const guild = new CustomUser(databaseItem.id)
      guild.modLogChannel = databaseItem.modLogChannel
      return guild
    }

    public async Save (): Promise<CustomUser> {
      return CustomUser.FromDatabase(await BaseAdapter.Save(this))
    }

    public async Update (): Promise<CustomUser> {
      return CustomUser.FromDatabase(await BaseAdapter.Save(this))
    }

    public async Delete (): Promise<boolean> {
      return await BaseAdapter.Save(this)
    }

    static async Get (id: string): Promise<CustomUser> {
      return CustomUser.FromDatabase(await BaseAdapter.Get(id, 'guild'))
    }

    static async GetByValue (key: string, value: string): Promise<CustomUser[]> {
      const results = await BaseAdapter.GetByValue(key, value, 'guild')
      const output: CustomUser[] = []
      results.forEach(result => {
        output.push(CustomUser.FromDatabase(result))
      })
      return output
    }

    static async Query (querySpec: SqlQuerySpec): Promise<CustomUser[]> {
      const queryOptions: FeedOptions = {
        partitionKey: 'guild'
      }
      const results = await BaseAdapter.Query(querySpec, queryOptions)
      const output: CustomUser[] = []
      results.forEach(result => {
        output.push(CustomUser.FromDatabase(result))
      })
      return output
    }
}
