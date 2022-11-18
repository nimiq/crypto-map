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
/**
 * 
 * @export
 * @interface EstablishmentIssueResponse
 */
export interface EstablishmentIssueResponse {
    /**
     * 
     * @type {string}
     * @memberof EstablishmentIssueResponse
     */
    message: string;
}

/**
 * Check if a given object implements the EstablishmentIssueResponse interface.
 */
export function instanceOfEstablishmentIssueResponse(value: object): boolean {
    let isInstance = true;
    isInstance = isInstance && "message" in value;

    return isInstance;
}

export function EstablishmentIssueResponseFromJSON(json: any): EstablishmentIssueResponse {
    return EstablishmentIssueResponseFromJSONTyped(json, false);
}

export function EstablishmentIssueResponseFromJSONTyped(json: any, ignoreDiscriminator: boolean): EstablishmentIssueResponse {
    if ((json === undefined) || (json === null)) {
        return json;
    }
    return {
        
        'message': json['message'],
    };
}

export function EstablishmentIssueResponseToJSON(value?: EstablishmentIssueResponse | null): any {
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

