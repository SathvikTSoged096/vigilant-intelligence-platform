from datetime import datetime
from sqlalchemy import Integer,String,DateTime,func
from sqlalchemy.orm import Mapped,mapped_column
from database.base import Base
class User(Base):
 __tablename__='users'; id:Mapped[int]=mapped_column(Integer,primary_key=True); username:Mapped[str]=mapped_column(String(120),unique=True,index=True); password_hash:Mapped[str]=mapped_column(String(255)); clearance:Mapped[str]=mapped_column(String(80),default='LEVEL 4 / RESTRICTED'); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),server_default=func.now())
