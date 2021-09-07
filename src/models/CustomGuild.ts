import { FeedOptions, SqlQuerySpec } from '@azure/cosmos'
import { DateTime } from 'luxon'
import { BaseAdapter } from '../adapters/BaseAdapter'
import { CustomError } from './CustomErrors'
import CustomUser from './CustomUser'
import IDatabaseObject from './DatabaseObject'

export default class CustomGuild implements IDatabaseObject {
    id: string | undefined
    kind: string = 'guild'
    modLogChannel: string | undefined
    feedbackBanned: string[] = []
    members: CustomUser[] = []
    private _timezone: string | undefined = 'America/New_York'
    public get timezone (): string | undefined {
      return this._timezone
    }

    public set timezone (value: string | undefined) {
      if (!value) return
      const date = DateTime.local().setZone(value)
      if (!date.isValid) {
        throw new CustomError(`${date.invalidReason} : ${date.invalidExplanation}`)
      }
      this._timezone = value
    }

    constructor (id: string) {
      this.id = id
    }

    static FromDatabase (databaseItem: any): CustomGuild {
      const guild = new CustomGuild(databaseItem.id)
      guild.modLogChannel = databaseItem.modLogChannel
      guild.timezone = databaseItem.timezone
      guild.feedbackBanned = databaseItem.feedbackBanned
      return guild
    }

    public async Save (): Promise<CustomGuild> {
      const existingGuild = await CustomGuild.Get(this.id!, false)
      if (existingGuild) {
        throw new CustomError('Guild already exist.')
      }
      const savedItem = await BaseAdapter.Save(this)
      return CustomGuild.FromDatabase(savedItem)
    }

    public async Update (): Promise<CustomGuild> {
      return CustomGuild.FromDatabase(await BaseAdapter.Update(this))
    }

    public async Delete (): Promise<boolean> {
      return await BaseAdapter.Delete(this)
    }

    static async Get (id: string, throwError:boolean = true): Promise<CustomGuild> {
      const dbItem = await BaseAdapter.Get(id, 'guild')
      if (!dbItem) {
        if (throwError) throw new CustomError('Guild not found')
        return dbItem
      }
      return CustomGuild.FromDatabase(dbItem)
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
