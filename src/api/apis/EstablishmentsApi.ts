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
  CategoriesIssueInner,
  CategoryInner,
  CryptoEstablishment,
  CurrencyInner,
  EstablishmentCandidateBody,
  EstablishmentCandidateResponse,
  EstablishmentIssueBody,
  EstablishmentIssueResponse,
} from '../models';
import {
    CategoriesIssueInnerFromJSON,
    CategoriesIssueInnerToJSON,
    CategoryInnerFromJSON,
    CategoryInnerToJSON,
    CryptoEstablishmentFromJSON,
    CryptoEstablishmentToJSON,
    CurrencyInnerFromJSON,
    CurrencyInnerToJSON,
    EstablishmentCandidateBodyFromJSON,
    EstablishmentCandidateBodyToJSON,
    EstablishmentCandidateResponseFromJSON,
    EstablishmentCandidateResponseToJSON,
    EstablishmentIssueBodyFromJSON,
    EstablishmentIssueBodyToJSON,
    EstablishmentIssueResponseFromJSON,
    EstablishmentIssueResponseToJSON,
} from '../models';

export interface GetEstablishmentByIdRequest {
    establishmentId: string;
}

export interface PostCandidateRequest {
    establishmentCandidateBody?: EstablishmentCandidateBody;
}

export interface PostEstablishmentIssueRequest {
    establishmentIssueBody?: EstablishmentIssueBody;
}

export interface SearchEstablishmentsRequest {
    filterCurrency?: Array<string>;
    filterCategory?: Array<string>;
    filterBoundingBox?: string;
}

/**
 * 
 */
export class EstablishmentsApi extends runtime.BaseAPI {

    /**
     * Nimiq Categories
     */
    async getCategoriesRaw(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<CategoryInner>>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/establishments/categories`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(CategoryInnerFromJSON));
    }

    /**
     * Nimiq Categories
     */
    async getCategories(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<CategoryInner>> {
        const response = await this.getCategoriesRaw(initOverrides);
        return await response.value();
    }

    /**
     * CryptoCurrencies
     */
    async getCurrenciesRaw(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<CurrencyInner>>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/currencies`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(CurrencyInnerFromJSON));
    }

    /**
     * CryptoCurrencies
     */
    async getCurrencies(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<CurrencyInner>> {
        const response = await this.getCurrenciesRaw(initOverrides);
        return await response.value();
    }

    /**
     * Get establishment by id
     */
    async getEstablishmentByIdRaw(requestParameters: GetEstablishmentByIdRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<CryptoEstablishment>> {
        if (requestParameters.establishmentId === null || requestParameters.establishmentId === undefined) {
            throw new runtime.RequiredError('establishmentId','Required parameter requestParameters.establishmentId was null or undefined when calling getEstablishmentById.');
        }

        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/establishments/{establishmentId}`.replace(`{${"establishmentId"}}`, encodeURIComponent(String(requestParameters.establishmentId))),
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => CryptoEstablishmentFromJSON(jsonValue));
    }

    /**
     * Get establishment by id
     */
    async getEstablishmentById(requestParameters: GetEstablishmentByIdRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<CryptoEstablishment> {
        const response = await this.getEstablishmentByIdRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Get issue categories with its label
     */
    async getIssueCategoriesRaw(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<CategoriesIssueInner>>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/establishments/issues/categories`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(CategoriesIssueInnerFromJSON));
    }

    /**
     * Get issue categories with its label
     */
    async getIssueCategories(initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<CategoriesIssueInner>> {
        const response = await this.getIssueCategoriesRaw(initOverrides);
        return await response.value();
    }

    /**
     * Create a new candidate for a establishment
     */
    async postCandidateRaw(requestParameters: PostCandidateRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<EstablishmentCandidateResponse>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/api/establishments/candidates`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: EstablishmentCandidateBodyToJSON(requestParameters.establishmentCandidateBody),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => EstablishmentCandidateResponseFromJSON(jsonValue));
    }

    /**
     * Create a new candidate for a establishment
     */
    async postCandidate(requestParameters: PostCandidateRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<EstablishmentCandidateResponse> {
        const response = await this.postCandidateRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Create a new issue for a establishment
     */
    async postEstablishmentIssueRaw(requestParameters: PostEstablishmentIssueRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<EstablishmentIssueResponse>> {
        const queryParameters: any = {};

        const headerParameters: runtime.HTTPHeaders = {};

        headerParameters['Content-Type'] = 'application/json';

        const response = await this.request({
            path: `/api/establishments/issues`,
            method: 'POST',
            headers: headerParameters,
            query: queryParameters,
            body: EstablishmentIssueBodyToJSON(requestParameters.establishmentIssueBody),
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => EstablishmentIssueResponseFromJSON(jsonValue));
    }

    /**
     * Create a new issue for a establishment
     */
    async postEstablishmentIssue(requestParameters: PostEstablishmentIssueRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<EstablishmentIssueResponse> {
        const response = await this.postEstablishmentIssueRaw(requestParameters, initOverrides);
        return await response.value();
    }

    /**
     * Search for establishments
     */
    async searchEstablishmentsRaw(requestParameters: SearchEstablishmentsRequest, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<runtime.ApiResponse<Array<CryptoEstablishment>>> {
        const queryParameters: any = {};

        if (requestParameters.filterCurrency) {
            queryParameters['filter[currency]'] = requestParameters.filterCurrency;
        }

        if (requestParameters.filterCategory) {
            queryParameters['filter[category]'] = requestParameters.filterCategory;
        }

        if (requestParameters.filterBoundingBox !== undefined) {
            queryParameters['filter[bounding_box]'] = requestParameters.filterBoundingBox;
        }

        const headerParameters: runtime.HTTPHeaders = {};

        const response = await this.request({
            path: `/api/establishments/search`,
            method: 'GET',
            headers: headerParameters,
            query: queryParameters,
        }, initOverrides);

        return new runtime.JSONApiResponse(response, (jsonValue) => jsonValue.map(CryptoEstablishmentFromJSON));
    }

    /**
     * Search for establishments
     */
    async searchEstablishments(requestParameters: SearchEstablishmentsRequest = {}, initOverrides?: RequestInit | runtime.InitOverrideFunction): Promise<Array<CryptoEstablishment>> {
        const response = await this.searchEstablishmentsRaw(requestParameters, initOverrides);
        return await response.value();
    }

}