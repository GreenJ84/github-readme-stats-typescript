import axios from 'axios';
import dotenv from 'dotenv';

import { wakaRaw, wakaResponse } from './wakatimeTypes';
import { ResponseError, WAKA_TIME_URL } from '../utils/constants';
import { setCacheData } from '../utils/cache';
import { shaveData } from './apiParse';

dotenv.config()

export const getWakaStats = async (username: string): Promise<wakaResponse > => {
    if (process.env.WAKATIME_TOKEN === undefined) {
        throw new ResponseError(
            "Error accessing WakaTime API Token",
            "WakaTime Token environmental variable is missing",
            500
        );
    }

    const config = axios.create({
        baseURL: WAKA_TIME_URL,
        headers: {
            Authorization: `Basic ${Buffer.from(process.env.WAKATIME_TOKEN!).toString('base64')}`
        }
    });
    const response = await config.get(`users/${username}/stats/all_time`, {
        params: {}
    })
        .then(res => {
            return res.data.data as wakaRaw
        })
        .catch(err => {
            throw new ResponseError(
                `Error accessing WakaTime API: ${err.response.statusText}`,
                err, err.response.status
            );
        });
    // Shave unnecessary data to spare cache
    const data = shaveData(response);
    return data;
}

export const updateWakaProfile = async (cacheKey: string, intervalID: NodeJS.Timer, username: string) => {
    try {
        // Query WakaTime api
        const queryRepsonse: wakaResponse = await getWakaStats(username)
            .catch(err => {
                throw err;
            });
        
        await setCacheData(cacheKey, {
            interval: intervalID,
            data: queryRepsonse
            }
        );
        
    } catch (err) {
        if (err instanceof ResponseError) {
            console.error(`Error (${err.error}) updating user data for ${username}: ${err.message}`);
        } else {
            console.error(`Error updating user data for ${username}: ${err}`);
        }
    }
}