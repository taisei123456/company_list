import os 
from flask import Flask, render_template, request, jsonify
import pymysql

app = Flask(__name__)

# ★★★ ここにRDSの接続情報を設定してください ★★★
DB_HOST = os.environ.get('DB_HOST')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_NAME = os.environ.get('DB_NAME')

def get_db_connection():
    """
    データベース接続を確立する関数。
    データベースとの接続に失敗した場合、例外を発生させます。
    """
    try:
        conn = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor
        )
        return conn
    except Exception as e:
        print(f"データベース接続エラー: {e}")
        return None

@app.route('/')
def index():
    """
    ルートURL ('/') へのアクセスを処理する。
    HTMLテンプレートをレンダリングして返す。
    """
    return render_template('index.html')

@app.route('/api/companies', methods=['GET', 'POST'])
def handle_companies():
    """
    企業情報の一覧取得 (GET) と新規登録 (POST) を処理するAPIエンドポイント。
    """
    conn = get_db_connection()
    if conn is None:
        return jsonify({"success": False, "message": "データベースに接続できませんでした。"}), 500

    if request.method == 'POST':
        # 企業情報の新規登録処理
        try:
            data = request.json
            columns = ', '.join([f'`{key}`' for key in data.keys()])
            placeholders = ', '.join(['%s'] * len(data))
            values = list(data.values())

            with conn.cursor() as cursor:
                sql = f"INSERT INTO companies ({columns}) VALUES ({placeholders})"
                cursor.execute(sql, values)
            conn.commit()
            return jsonify({"success": True, "message": "企業情報を登録しました。"})
        except Exception as e:
            conn.rollback()
            print(f"企業情報登録エラー: {e}")
            return jsonify({"success": False, "message": "登録中にエラーが発生しました。"}), 500
        finally:
            conn.close()

    elif request.method == 'GET':
        # 企業情報の一覧取得処理
        try:
            with conn.cursor() as cursor:
                sql = "SELECT * FROM companies ORDER BY companyName"
                cursor.execute(sql)
                companies = cursor.fetchall()
            return jsonify({"success": True, "companies": companies})
        except Exception as e:
            print(f"企業情報取得エラー: {e}")
            return jsonify({"success": False, "message": "企業情報の取得中にエラーが発生しました。"}), 500
        finally:
            conn.close()

@app.route('/api/companies/<int:company_id>', methods=['GET', 'PUT', 'DELETE'])
def handle_company(company_id):
    """
    指定されたIDの企業情報の取得、更新、削除を処理するAPIエンドポイント。
    """
    conn = get_db_connection()
    if conn is None:
        return jsonify({"success": False, "message": "データベースに接続できませんでした。"}), 500
    
    # 企業情報の取得 (GET)
    if request.method == 'GET':
        try:
            with conn.cursor() as cursor:
                sql = "SELECT * FROM companies WHERE id = %s"
                cursor.execute(sql, (company_id,))
                company = cursor.fetchone()
                if company:
                    return jsonify({"success": True, "company": company})
                else:
                    return jsonify({"success": False, "message": "企業情報が見つかりません。"})
        except Exception as e:
            print(f"企業情報取得エラー: {e}")
            return jsonify({"success": False, "message": "企業情報の取得中にエラーが発生しました。"}), 500
        finally:
            conn.close()

    # 企業情報の更新 (PUT)
    elif request.method == 'PUT':
        try:
            data = request.json
            set_clauses = ', '.join([f"`{key}` = %s" for key in data.keys()])
            values = list(data.values())
            values.append(company_id)
            
            with conn.cursor() as cursor:
                sql = f"UPDATE companies SET {set_clauses} WHERE id = %s"
                cursor.execute(sql, tuple(values))
            conn.commit()
            return jsonify({"success": True, "message": "企業情報を更新しました。"})
        except Exception as e:
            conn.rollback()
            print(f"企業情報更新エラー: {e}")
            return jsonify({"success": False, "message": "更新中にエラーが発生しました。"}), 500
        finally:
            conn.close()

    # 企業情報の削除 (DELETE)
    elif request.method == 'DELETE':
        try:
            with conn.cursor() as cursor:
                sql = "DELETE FROM companies WHERE id = %s"
                cursor.execute(sql, (company_id,))
                conn.commit()
                if cursor.rowcount > 0:
                    return jsonify({"success": True, "message": "企業情報を削除しました。"})
                else:
                    return jsonify({"success": False, "message": "指定された企業が見つかりません。"})
        except Exception as e:
            conn.rollback()
            print(f"企業情報削除エラー: {e}")
            return jsonify({"success": False, "message": "削除中にエラーが発生しました。"}), 500
        finally:
            conn.close()

@app.route('/api/compare', methods=['POST'])
def compare_companies():
    """
    選択された複数の企業情報を比較用に取得するAPIエンドポイント。
    """
    conn = get_db_connection()
    if conn is None:
        return jsonify({"success": False, "message": "データベースに接続できませんでした。"}), 500

    try:
        data = request.json
        company_ids = data.get('ids', [])
        
        if not company_ids:
            return jsonify({"success": False, "message": "比較する企業が選択されていません。"}), 400

        # SQLインジェクションを防ぐために、プレースホルダーを使用
        placeholders = ', '.join(['%s'] * len(company_ids))
        sql = f"SELECT * FROM companies WHERE id IN ({placeholders})"
        
        with conn.cursor() as cursor:
            cursor.execute(sql, company_ids)
            companies = cursor.fetchall()
            
        return jsonify({"success": True, "companies": companies})
    except Exception as e:
        print(f"比較情報取得エラー: {e}")
        return jsonify({"success": False, "message": "比較情報の取得中にエラーが発生しました。"}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
