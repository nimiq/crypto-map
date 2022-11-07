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
 * @interface LocationCandidateResponse
 */
export interface LocationCandidateResponse {
    /**
     * 
     * @type {string}
     * @memberof LocationCandidateResponse
     */
    message: string;
}

/**
 * Check if a given object implements the LocationCandidateResponse interface.
 */
export function instanceOfLocationCandidateResponse(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "message" in value;

    return isInstance;
}

export function LocationCandidateResponseFromJSON(json: any): LocationCandidateResponse {
    return LocationCandidateResponseFromJSONTyped(json, false);
}

export function LocationCandidateResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): LocationCandidateResponse {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'message': json['message'],
    };
}

export function LocationCandidateResponseToJSON(value?: LocationCandidateResponse | null): any {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    return {
        
        'message': value.message,
    };
}
