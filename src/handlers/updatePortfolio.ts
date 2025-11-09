import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDb } from '../config/data-source';
import { config } from '../config';
import { validateUpdatePayload } from '../utils/validation';

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

		const payload = event.body ? JSON.parse(event.body) : {};

		// validate payload with shared utility
		const validation = validateUpdatePayload(payload);
		if (!validation.valid) {
			return {
				statusCode: 400,
				headers: CORS_HEADERS,
				body: JSON.stringify({ error: validation.error }),
			};
		}

		// check exists
		const getCommand = new GetCommand({ TableName: TABLE_NAME, Key: { id } });
		const existing = await dynamoDb.send(getCommand);
		if (!existing.Item) {
			return {
				statusCode: 404,
				headers: CORS_HEADERS,
				body: JSON.stringify({ error: 'Portfolio not found' }),
			};
		}

		const updateExpressions: string[] = [];
		const expressionAttributeNames: Record<string, string> = {};
		const expressionAttributeValues: Record<string, any> = {};

		if (payload.name !== undefined) {
			updateExpressions.push('#name = :name');
			expressionAttributeNames['#name'] = 'name';
			expressionAttributeValues[':name'] = payload.name;
		}
		if (payload.description !== undefined) {
			updateExpressions.push('#description = :description');
			expressionAttributeNames['#description'] = 'description';
			expressionAttributeValues[':description'] = payload.description;
		}
		if (payload.skills !== undefined) {
			updateExpressions.push('#skills = :skills');
			expressionAttributeNames['#skills'] = 'skills';
			expressionAttributeValues[':skills'] = payload.skills;
		}

		updateExpressions.push('#updatedAt = :updatedAt');
		expressionAttributeNames['#updatedAt'] = 'updatedAt';
		expressionAttributeValues[':updatedAt'] = new Date().toISOString();

		const command = new UpdateCommand({
			TableName: TABLE_NAME,
			Key: { id },
			UpdateExpression: `SET ${updateExpressions.join(', ')}`,
			ExpressionAttributeNames: expressionAttributeNames,
			ExpressionAttributeValues: expressionAttributeValues,
			ReturnValues: 'ALL_NEW',
		});

		const result = await dynamoDb.send(command);
		return {
			statusCode: 200,
			headers: CORS_HEADERS,
			body: JSON.stringify(result.Attributes),
		};
	} catch (err: any) {
		console.error('Error updating portfolio:', err);
		return {
			statusCode: 500,
			headers: CORS_HEADERS,
			body: JSON.stringify({ error: err.message || 'Internal error' }),
		};
	}
};