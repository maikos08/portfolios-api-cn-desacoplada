import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
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
		const id = event.pathParameters?.id;
		if (!id) {
			return {
				statusCode: 400,
				headers: CORS_HEADERS,
				body: JSON.stringify({ error: 'Missing id parameter' }),
			};
		}

		// Verificar que el item existe antes de eliminar
		const getCommand = new GetCommand({ TableName: TABLE_NAME, Key: { id } });
		const existing = await dynamoDb.send(getCommand);

		if (!existing.Item) {
			return {
				statusCode: 404,
				headers: CORS_HEADERS,
				body: JSON.stringify({ error: 'Portfolio not found' }),
			};
		}

		// Eliminar el item
		const deleteCommand = new DeleteCommand({ TableName: TABLE_NAME, Key: { id } });
		await dynamoDb.send(deleteCommand);

		return {
			statusCode: 204,
			headers: CORS_HEADERS,
			body: '',
		};
	} catch (err: any) {
		console.error('Error deleting portfolio:', err);
		return {
			statusCode: 500,
			headers: CORS_HEADERS,
			body: JSON.stringify({ error: err.message || 'Internal error' }),
		};
	}
};