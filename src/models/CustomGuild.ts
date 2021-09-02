import { FeedOptions, SqlQuerySpec } from '@azure/cosmos'
import { BaseAdapter } from '../adapters/BaseAdapter'
import IDatabaseObject from './DatabaseObject'

export default class CustomGuild implements IDatabaseObject {
    id: string | undefined
    kind: string = 'guild'
    modLogChannel: string | undefined

    constructor (id: string) {
      this.id = id
    }

    static FromDatabase (databaseItem: any): CustomGuild {
      const guild = new CustomGuild(databaseItem.id)
      guild.modLogChannel = databaseItem.modLogChannel
      return guild
    }

    public async Save (): Promise<CustomGuild> {
      return CustomGuild.FromDatabase(await BaseAdapter.Save(this))
    }

    public async Update (): Promise<CustomGuild> {
      return CustomGuild.FromDatabase(await BaseAdapter.Save(this))
    }

    public async Delete (): Promise<boolean> {
      return await BaseAdapter.Save(this)
    }

    static async Get (id: string): Promise<CustomGuild> {
      return CustomGuild.FromDatabase(await BaseAdapter.Get(id, 'guild'))
    }

    static async GetByValue (key: string, value: string): Promise<CustomGuild[]> {
      const results = await BaseAdapter.GetByValue(key, value, 'guild')
      const output: CustomGuild[] = []
      results.forEach(result => {
        output.push(CustomGuild.FromDatabase(result))
      })
      return output
    }

    static async Query (querySpec: SqlQuerySpec): Promise<CustomGuild[]> {
      const queryOptions: FeedOptions = {
        partitionKey: 'guild'
      }
      const results = await BaseAdapter.Query(querySpec, queryOptions)
      const output: CustomGuild[] = []
      results.forEach(result => {
        output.push(CustomGuild.FromDatabase(result))
      })
      return output
    }
}
