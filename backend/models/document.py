from datetime import datetime
from sqlalchemy import Integer,String,DateTime,Text,ForeignKey,func
from sqlalchemy.orm import Mapped,mapped_column
from database.base import Base
class Document(Base):
 __tablename__='documents'; id:Mapped[int]=mapped_column(Integer,primary_key=True); filename:Mapped[str]=mapped_column(String(255)); object_name:Mapped[str]=mapped_column(String(512),unique=True); content_type:Mapped[str]=mapped_column(String(120)); size_bytes:Mapped[int]=mapped_column(Integer); uploaded_by:Mapped[int]=mapped_column(ForeignKey('users.id')); status:Mapped[str]=mapped_column(String(40),default='UPLOADED'); error_message:Mapped[str|None]=mapped_column(Text); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),server_default=func.now())
class AuditLog(Base):
 __tablename__='audit_logs'; id:Mapped[int]=mapped_column(Integer,primary_key=True); user_id:Mapped[int|None]=mapped_column(ForeignKey('users.id')); action:Mapped[str]=mapped_column(String(120)); resource:Mapped[str|None]=mapped_column(String(255)); created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),server_default=func.now())
