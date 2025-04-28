import psycopg
import psycopg_pool
from config import config

pool_default = psycopg_pool.ConnectionPool(
    config.PGSQL_TEST_DATABASE_STRING,
    min_size=config.PGSQL_TEST_POOL_MIN_SIZE,
    max_size=config.PGSQL_TEST_POOL_MAX_SIZE,
    max_idle=config.PGSQL_TEST_POOL_MAX_IDLE
)

# 오피스텔 조회
def map_opi():
    with pool_default.connection() as conn:
        cur = conn.cursor(row_factory=psycopg.rows.dict_row)

        try:
            cur.execute("SELECT * FROM public.tb_property")
            user = cur.fetchall()
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

def house_opi(id):
    with pool_default.connection() as conn:
        cur = conn.cursor(row_factory=psycopg.rows.dict_row)

        try:
            cur.execute("SELECT * FROM public.tb_property_detail WHERE property_id = %s", (id,))
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

# 빌라 조회
def map_villa():
    with pool_default.connection() as conn:
        cur = conn.cursor(row_factory=psycopg.rows.dict_row)

        try:
            cur.execute("SELECT * FROM public.tb_property_villa")
            user = cur.fetchall()
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

def house_villa(id):
    with pool_default.connection() as conn:
        cur = conn.cursor(row_factory=psycopg.rows.dict_row)

        try:
            cur.execute("SELECT * FROM public.tb_property_detail_villa WHERE property_id = %s", (id,))
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

# 원룸 조회
def map_oneroom():
    with pool_default.connection() as conn:
        cur = conn.cursor(row_factory=psycopg.rows.dict_row)

        try:
            cur.execute("SELECT * FROM public.tb_property_oneroom")
            user = cur.fetchall()
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

def house_oneroom(id):
    with pool_default.connection() as conn:
        cur = conn.cursor(row_factory=psycopg.rows.dict_row)

        try:
            cur.execute("SELECT * FROM public.tb_property_detail_oneroom WHERE property_id = %s", (id,))
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

# 즐겨찾기 추가
def insert_fav(user_id,address,jeonse_price,estimated_jeonse_price,risk_level,property_id,room_type):
    with pool_default.connection() as conn:
        cur = conn.cursor(row_factory=psycopg.rows.dict_row)

        try:
            cur.execute("INSERT INTO tb_property_fav (user_id,address,jeonse_price,estimated_jeonse_price,risk_level,property_id,room_type) VALUES (%s,%s,%s,%s,%s,%s,%s);", (user_id,address,jeonse_price,estimated_jeonse_price,risk_level,property_id,room_type))
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

# 즐겨찾기 조회
def fav_list(user_id):
    with pool_default.connection() as conn:
        cur = conn.cursor(row_factory=psycopg.rows.dict_row)
        try:
            results = cur.execute("SELECT * FROM public.tb_property_fav where user_id = %s;",(user_id,)).fetchall()
        except psycopg.OperationalError as err:
            print(err)
        except psycopg.ProgrammingError as err:
            print(err)
            results = False
        except psycopg.InternalError as err:
            print(err)
            results = False
        finally:
            cur.close()
    return results