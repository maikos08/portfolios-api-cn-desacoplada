import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDb } from '../config/data-source';
import { config } from '../config';

const TABLE_NAME = config.dynamodb.tableName;

const CORS_HEADERS = {
	'Content-Type': 'application/json',
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
	'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

export const handler = async (
	event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
	try {
		const command = new ScanCommand({ TableName: TABLE_NAME });
		const result = await dynamoDb.send(command);
		const items = result.Items || [];

		return {
			statusCode: 200,
			headers: CORS_HEADERS,
			body: JSON.stringify(items),
		};
	} catch (err: any) {
		console.error('Error scanning portfolios:', err);
		return {
			statusCode: 500,
			headers: CORS_HEADERS,
			body: JSON.stringify({ error: err.message || 'Internal error' }),
		};
	}
};