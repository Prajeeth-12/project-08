import asyncio

from sqlalchemy import text
from backend.database import engine


async def main():
    try:
        async with engine.connect() as connection:
            result = await connection.execute(
                text("SELECT current_database(), current_user")
            )

            print("Connected successfully!")
            print(result.fetchone())

    finally:
        await engine.dispose()


asyncio.run(main())