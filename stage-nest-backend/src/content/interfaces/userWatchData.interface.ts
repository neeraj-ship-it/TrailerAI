export interface IUserWatchData {
  CONTENTS: string; // JSON string containing IContent[]
  CREATED_AT: string;
  UPDATED_AT: string;
  USER_ID: string;
}

export interface IContent {
  _id: number;
  contentType: string;
  dialect: string;
  rank: number;
  slug: string;
}

export interface IAirbyteMessage {
  _airbyte_ab_id: string;
  _airbyte_data: IUserWatchData;
  _airbyte_emitted_at: number;
  _airbyte_stream: string;
  rawMessage: string;
}
