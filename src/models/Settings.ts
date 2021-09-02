export class CosmosSettings {
    cosmosEndpoint: string = '';
    cosmosKey: string = '';
    cosmosDatabase: string = '';
    cosmosContainer: string = '';
}

export interface Settings {
  token: string;
  cosmos: CosmosSettings;
}
