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
 * @interface CryptoLocationGeoLocation
 */
export interface CryptoLocationGeoLocation {
    /**
     * 
     * @type {number}
     * @memberof CryptoLocationGeoLocation
     */
    lat: number;
    /**
     * 
     * @type {number}
     * @memberof CryptoLocationGeoLocation
     */
    lng: number;
}

/**
 * Check if a given object implements the CryptoLocationGeoLocation interface.
 */
export function instanceOfCryptoLocationGeoLocation(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "lat" in value;
    isInstance = isInstance && "lng" in value;

    return isInstance;
}

export function CryptoLocationGeoLocationFromJSON(json: any): CryptoLocationGeoLocation {
    return CryptoLocationGeoLocationFromJSONTyped(json, false);
}

export function CryptoLocationGeoLocationFromJSONTyped(json: any, ignoreDiscriminator: boolean): CryptoLocationGeoLocation {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'lat': json['lat'],
        'lng': json['lng'],
    };
}

export function CryptoLocationGeoLocationToJSON(value?: CryptoLocationGeoLocation | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'lat': value.lat,
        'lng': value.lng,
    };
}
