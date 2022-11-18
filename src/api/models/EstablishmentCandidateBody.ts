/* tslint:disable */
/* eslint-disable */
/**
 * Crypto Map API documentation
 * The Shop Directory API is serves a list of shops that accept crypto as a payment method.
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
/**
 * 
 * @export
 * @interface EstablishmentCandidateBody
 */
export interface EstablishmentCandidateBody {
    /**
     * 
     * @type {string}
     * @memberof EstablishmentCandidateBody
     */
    gmaps_place_id: string;
    /**
     * 
     * @type {string}
     * @memberof EstablishmentCandidateBody
     */
    token: string;
    /**
     * 
     * @type {string}
     * @memberof EstablishmentCandidateBody
     */
    name: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof EstablishmentCandidateBody
     */
    currencies: Array<string>;
}

/**
 * Check if a given object implements the EstablishmentCandidateBody interface.
 */
export function instanceOfEstablishmentCandidateBody(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "gmaps_place_id" in value;
    isInstance = isInstance && "token" in value;
    isInstance = isInstance && "name" in value;
    isInstance = isInstance && "currencies" in value;

    return isInstance;
}

export function EstablishmentCandidateBodyFromJSON(json: any): EstablishmentCandidateBody {
    return EstablishmentCandidateBodyFromJSONTyped(json, false);
}

export function EstablishmentCandidateBodyFromJSONTyped(json: any, ignoreDiscriminator: boolean): EstablishmentCandidateBody {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'gmaps_place_id': json['gmaps_place_id'],
        'token': json['token'],
        'name': json['name'],
        'currencies': json['currencies'],
    };
}

export function EstablishmentCandidateBodyToJSON(value?: EstablishmentCandidateBody | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'gmaps_place_id': value.gmaps_place_id,
        'token': value.token,
        'name': value.name,
        'currencies': value.currencies,
    };
}
