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


import * as runtime from '../runtime';
import type {
  SearchLocationsResponse,
} from '../models';
import {
    SearchLocationsResponseFromJSON,
    SearchLocationsResponseToJSON,
} from '../models';

export interface SearchLocationsRequest {
    filterCity?: string;
    filterCountry?: string;
    filterDescription?: string;
    filterEmail?: string;
    filterLabel?: string;
    filterAddressLine1?: string;
    filterAddressLine2?: string;
    filterAddressLine3?: string;
    filterNumber?: number;
    filterWebsite?: string;
    filterZip?: string;
    filterBoundingBox?: string;
    filterLimit?: number;
    filterDigitalGoods?: boolean;
}

/**
 * 
 */
export class LocationsApi extends runtime.BaseAPI {

    /**
     * search
     */
    async searchLocationsRaw(requestParameters: SearchLocationsRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<SearchLocationsResponse>> {
        const queryParameters: any = {};

        if (requestParameters.filterCity !== undefined) {
            queryParameters['filter[city]'] = requestParameters.filterCity;
        }

        if (requestParameters.filterCountry !== undefined) {
            queryParameters['filter[country]'] = requestParameters.filterCountry;
        }

        if (requestParameters.filterDescription !== undefined) {
            queryParameters['filter[description]'] = requestParameters.filterDescription;
        }

        if (requestParameters.filterEmail !== undefined) {
            queryParameters['filter[email]'] = requestParameters.filterEmail;
        }

        if (requestParameters.filterLabel !== undefined) {
            queryParameters['filter[label]'] = requestParameters.filterLabel;
        }

        if (requestParameters.filterAddressLine1 !== undefined) {
            queryParameters['filter[address_line_1]'] = requestParameters.filterAddressLine1;
        }

        if (requestParameters.filterAddressLine2 !== undefined) {
            queryParameters['filter[address_line_2]'] = requestParameters.filterAddressLine2;
        }

        if (requestParameters.filterAddressLine3 !== undefined) {
            queryParameters['filter[address_line_3]'] = requestParameters.filterAddressLine3;
        }

        if (requestParameters.filterNumber !== undefined) {
            queryParameters['filter[number]'] = requestParameters.filterNumber;
        }

        if (requestParameters.filterWebsite !== undefined) {
            queryParameters['filter[website]'] = requestParameters.filterWebsite;
        }

        if (requestParameters.filterZip !== undefined) {
            queryParameters['filter[zip]'] = requestParameters.filterZip;
        }

        if (requestParameters.filterBoundingBox !== undefined) {
            queryParameters['filter[bounding_box]'] = requestParameters.filterBoundingBox;
        }

        if (requestParameters.filterLimit !== undefined) {
            queryParameters['filter[limit]'] = requestParameters.filterLimit;
        }

        if (requestParameters.filterDigitalGoods !== undefined) {
            queryParameters['filter[digital_goods]'] = requestParameters.filterDigitalGoods;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/search`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => SearchLocationsResponseFromJSON(jsonValue));
    }

    /**
     * search
     */
    async searchLocations(requestParameters: SearchLocationsRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<SearchLocationsResponse> {
        const response = await this.searchLocationsRaw(requestParameters, initOverrides);
        return await response.value();
    }

}
