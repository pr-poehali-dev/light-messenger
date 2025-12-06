import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Поиск пользователей по username и каналов по названию
    Args: event - запрос с httpMethod и queryStringParameters
          context - контекст выполнения функции
    Returns: HTTP ответ со списком найденных пользователей и каналов
    '''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Database not configured'}),
            'isBase64Encoded': False
        }
    
    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        query = params.get('q', '').strip()
        
        if not query or len(query) < 2:
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'users': [], 'channels': []}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        try:
            search_pattern = f'%{query}%'
            
            cur.execute(
                "SELECT id, username, email FROM users WHERE username ILIKE %s LIMIT 10",
                (search_pattern,)
            )
            users = cur.fetchall()
            
            cur.execute(
                "SELECT id, name, description, creator_id FROM channels WHERE name ILIKE %s LIMIT 10",
                (search_pattern,)
            )
            channels = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'users': [
                        {'id': u[0], 'username': u[1], 'email': u[2]}
                        for u in users
                    ],
                    'channels': [
                        {'id': c[0], 'name': c[1], 'description': c[2], 'creator_id': c[3]}
                        for c in channels
                    ]
                }),
                'isBase64Encoded': False
            }
        
        finally:
            cur.close()
            conn.close()
    
    return {
        'statusCode': 405,
        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'error': 'Method not allowed'}),
        'isBase64Encoded': False
    }
