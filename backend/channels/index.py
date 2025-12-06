import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Создание и управление каналами
    Args: event - запрос с httpMethod, body, headers
          context - контекст выполнения функции
    Returns: HTTP ответ с результатом операции над каналом
    '''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    
    headers = event.get('headers', {})
    user_id = headers.get('X-User-Id') or headers.get('x-user-id')
    
    conn = psycopg2.connect(database_url)
    cur = conn.cursor()
    
    try:
        if method == 'POST':
            if not user_id:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Unauthorized'}),
                    'isBase64Encoded': False
                }
            
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'create':
                name = body.get('name', '').strip()
                description = body.get('description', '').strip()
                
                if not name:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Название канала обязательно'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "INSERT INTO channels (name, description, creator_id) VALUES (%s, %s, %s) RETURNING id, name, description",
                    (name, description, int(user_id))
                )
                channel = cur.fetchone()
                
                cur.execute(
                    "INSERT INTO channel_members (channel_id, user_id) VALUES (%s, %s)",
                    (channel[0], int(user_id))
                )
                
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'success': True,
                        'channel': {
                            'id': channel[0],
                            'name': channel[1],
                            'description': channel[2]
                        }
                    }),
                    'isBase64Encoded': False
                }
            
            elif action == 'join':
                channel_id = body.get('channel_id')
                
                if not channel_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'channel_id обязателен'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "SELECT id FROM channels WHERE id = %s",
                    (channel_id,)
                )
                if not cur.fetchone():
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Канал не найден'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    "INSERT INTO channel_members (channel_id, user_id) VALUES (%s, %s) ON CONFLICT (channel_id, user_id) DO NOTHING",
                    (channel_id, int(user_id))
                )
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'Вы присоединились к каналу'}),
                    'isBase64Encoded': False
                }
        
        elif method == 'GET':
            if not user_id:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Unauthorized'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                """
                SELECT c.id, c.name, c.description, c.creator_id
                FROM channels c
                INNER JOIN channel_members cm ON c.id = cm.channel_id
                WHERE cm.user_id = %s
                ORDER BY cm.joined_at DESC
                """,
                (int(user_id),)
            )
            channels = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'channels': [
                        {'id': c[0], 'name': c[1], 'description': c[2], 'creator_id': c[3]}
                        for c in channels
                    ]
                }),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
