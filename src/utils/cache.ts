import { RedisClientType, createClient } from "redis";
import flatted from 'flatted';

import {
  PRODUCTION,
  PROD_HOST,
  PROD_PORT,
  REDIS_PASS,
  REDIS_USER
} from "../environment";
import { UserData as GithubUserData } from "../github/types";
import { UserData as LeetCodeUserData } from "../leetcode/types";
import { UserData as WakaTimeUserData } from "../wakatime/types";

import { developmentLogger, ResponseError } from "./utils";

export type RedisCache = GithubUserData
  | LeetCodeUserData
  | WakaTimeUserData
  | { times: 1 };

export class Cache {
  private client: RedisClientType;

  constructor(){
    this.client = PRODUCTION ?
      createClient({
          url: `redis://${REDIS_USER}:${REDIS_PASS}@${PROD_HOST}:${PROD_PORT}`,
        })
      : createClient();

    this.client.on("error", (err) => developmentLogger(console.error, `Redis Client error: ${err}`));
  }

  async createConnection(){
    await this.client
      .connect()
      .then(() => console.log("Redis server connected."));
  }

  async tearConnection(){
    await this.client
      .disconnect()
      .then(() => console.log("Redis server disconnected"));
  }

  static keyGenerator(platform: string): (username: string, subroute: string) => string {
    return (username: string, subroute: string) => {
      return `${platform}:${username}:${subroute}`;
    };
  }

  async setItem(
    key: string,
    data: RedisCache,
    persistent: boolean = false
  ): Promise<void> {
    try {
      if (persistent){
        await this.client.set(key, flatted.stringify(data));
      } else {
        const Expiration = PRODUCTION ?
          1000 * 60 * 60 * 24
          : 1000 * 60 * 10;
        await this.client.set(key, flatted.stringify(data), {
          PX: Expiration,
        });
      }
    }
    catch (error) {
      developmentLogger(console.error, `Error setting cache for ${key}: ${error}`);
      return;
    }
    developmentLogger(console.log, `Set cache for ${key}`);
  };

  async getItem(
    key: string
  ): Promise<RedisCache | null> {
    let data;
    try {
      developmentLogger(console.log, `Getting ${key}`);
      data = await this.client.get(key);
      if (data == undefined) throw Error("Cache empty");
    } catch (error) {
      developmentLogger(console.error,`Error getting cache for ${key}: ${error}`);
      return null;
    }
    developmentLogger(console.log, `Successfully retrieved`);
    return flatted.parse(data) as RedisCache;
  }

  async deleteItem(
    key: string
  ): Promise<boolean>{
    try {
      const response = await this.client.del(key);
      if (response == 0) return false;
    } catch (error) {
      developmentLogger(console.error, `Error deleting cache for ${key}: ${error}`);
      throw new ResponseError("Failed to delete cached user data after unregistering. Data will expire and be removed within the next 24hrs.", new Error(), 500);
    }
    developmentLogger(console.log, `Cache for ${key} deleted.`);
    return true;
  }
}