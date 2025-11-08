import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
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
		const payload = event.body ? JSON.parse(event.body) : null;
		if (!payload || !payload.name) {
			return {
				statusCode: 400,
				headers: CORS_HEADERS,
				body: JSON.stringify({ error: 'Invalid payload' }),
			};
		}

		const portfolio = {
			id: uuidv4(),
			name: payload.name,
			description: payload.description || '',
			skills: Array.isArray(payload.skills) ? payload.skills : [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const command = new PutCommand({ TableName: TABLE_NAME, Item: portfolio });
		await dynamoDb.send(command);

		return {
			statusCode: 201,
			headers: CORS_HEADERS,
			body: JSON.stringify(portfolio),
		};
	} catch (err: any) {
		console.error('Error creating portfolio:', err);
		return {
			statusCode: 500,
			headers: CORS_HEADERS,
			body: JSON.stringify({ error: err.message || 'Internal error' }),
		};
	}
};