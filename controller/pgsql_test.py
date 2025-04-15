import psycopg
import psycopg_pool
from config import config

pool_default = psycopg_pool.ConnectionPool(
    config.PGSQL_TEST_DATABASE_STRING,
    min_size=config.PGSQL_TEST_POOL_MIN_SIZE,
    max_size=config.PGSQL_TEST_POOL_MAX_SIZE,
    max_idle=config.PGSQL_TEST_POOL_MAX_IDLE
)
# 회원가입
def insert_mem(id, pw, name, phone, email):
    with pool_default.connection() as conn:
        cur = conn.cursor(row_factory=psycopg.rows.dict_row)

        try:
            cur.execute("INSERT INTO public.member (id, pw,name,phone,email) VALUES (%s, %s,%s, %s,%s)", (id, pw, name, phone, email))
            conn.commit()

        except psycopg.OperationalError as err:
            print(err)
        except psycopg.ProgrammingError as err:
            print(err)
        except psycopg.InternalError as err:
            print(err)
        except Exception as err:
            print(err) 
            return False
        finally:
            cur.close()
    return True

# 로그인
def get_user_id(id):
    with pool_default.connection() as conn:
        cur = conn.cursor(row_factory=psycopg.rows.dict_row)

        try:
            cur.execute("SELECT * FROM public.member WHERE id = %s", (id,))
            user = cur.fetchone()
            return user

        except psycopg.OperationalError as err:
            print(err)
        except psycopg.ProgrammingError as err:
            print(err)
        except psycopg.InternalError as err:
            print(err)
        except Exception as err:
            print(err) 
            return False
        finally:
            cur.close()
 
#회원정보 수정
def update_mem(id, pw, phone, email):
    with pool_default.connection() as conn:
        cur = conn.cursor(row_factory=
                          psycopg.rows.dict_row)

        try:
            cur.execute("UPDATE public.member SET pw = %s, phone = %s, email = %s WHERE id = %s", (pw, phone, email, id))
            conn.commit()

        except psycopg.OperationalError as err:
            print(err)
        except psycopg.ProgrammingError as err:
            print(err)
        except psycopg.InternalError as err:
            print(err)
        except Exception as err:
            print(err) 
            return False
        finally:
            cur.close()
    return True