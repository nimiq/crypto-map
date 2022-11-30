/* tslint:disable */
/* eslint-disable */
/**
 * Crypto Map API documentation
 * The Establishments map API is serves a list of establishments that accept crypto as a payment method.
 *
 * The version of the OpenAPI document: 1.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { exists, mapValues } from '../runtime';
import type { CryptoEstablishmentBaseInnerGeoLocation } from './CryptoEstablishmentBaseInnerGeoLocation';
import {
    CryptoEstablishmentBaseInnerGeoLocationFromJSON,
    CryptoEstablishmentBaseInnerGeoLocationFromJSONTyped,
    CryptoEstablishmentBaseInnerGeoLocationToJSON,
} from './CryptoEstablishmentBaseInnerGeoLocation';

/**
 * This is the basic information of an establishment that we show only in the map. If more information is required, you can use the /api/establishments/{establishmentId} endpoint.
 * @export
 * @interface CryptoEstablishmentBaseInner
 */
export interface CryptoEstablishmentBaseInner {
    /**
     * 
     * @type {number}
     * @memberof CryptoEstablishmentBaseInner
     */
    id: number;
    /**
     * 
     * @type {string}
     * @memberof CryptoEstablishmentBaseInner
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof CryptoEstablishmentBaseInner
     */
    category: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof CryptoEstablishmentBaseInner
     */
    currencies: Array<string>;
    /**
     * 
     * @type {CryptoEstablishmentBaseInnerGeoLocation}
     * @memberof CryptoEstablishmentBaseInner
     */
    geo_location: CryptoEstablishmentBaseInnerGeoLocation;
}

/**
 * Check if a given object implements the CryptoEstablishmentBaseInner interface.
 */
export function instanceOfCryptoEstablishmentBaseInner(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "id" in value;
    isInstance = isInstance && "name" in value;
    isInstance = isInstance && "category" in value;
    isInstance = isInstance && "currencies" in value;
    isInstance = isInstance && "geo_location" in value;

    return isInstance;
}

export function CryptoEstablishmentBaseInnerFromJSON(json: any): CryptoEstablishmentBaseInner {
    return CryptoEstablishmentBaseInnerFromJSONTyped(json, false);
}

export function CryptoEstablishmentBaseInnerFromJSONTyped(json: any, ignoreDiscriminator: boolean): CryptoEstablishmentBaseInner {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'id': json['id'],
        'name': json['name'],
        'category': json['category'],
        'currencies': json['currencies'],
        'geo_location': CryptoEstablishmentBaseInnerGeoLocationFromJSON(json['geo_location']),
    };
}

export function CryptoEstablishmentBaseInnerToJSON(value?: CryptoEstablishmentBaseInner | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'id': value.id,
        'name': value.name,
        'category': value.category,
        'currencies': value.currencies,
        'geo_location': CryptoEstablishmentBaseInnerGeoLocationToJSON(value.geo_location),
    };
}
