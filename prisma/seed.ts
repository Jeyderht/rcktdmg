import {PrismaClient,UserRole,CreatorStatus,ProductStatus,AccessType} from "@prisma/client";
const db=new PrismaClient();
async function main(){
 const creator=await db.user.upsert({where:{email:"creator@rcktdmg.local"},update:{},create:{name:"Creador Demo",email:"creator@rcktdmg.local",passwordHash:"CHANGE_ME",role:UserRole.CREATOR,creatorStatus:CreatorStatus.APPROVED}});
 await db.user.upsert({where:{email:"admin@rcktdmg.local"},update:{},create:{name:"Administrador",email:"admin@rcktdmg.local",passwordHash:"CHANGE_ME",role:UserRole.ADMIN}});
 await db.user.upsert({where:{email:"cliente@rcktdmg.local"},update:{},create:{name:"Cliente Demo",email:"cliente@rcktdmg.local",passwordHash:"CHANGE_ME",role:UserRole.CLIENT}});
 const cat=await db.category.upsert({where:{slug:"plantillas"},update:{},create:{name:"Plantillas",slug:"plantillas"}});
 await db.plan.upsert({where:{id:"demo-pro-plan"},update:{},create:{id:"demo-pro-plan",name:"PRO",monthlyPrice:59,yearlyPrice:590,downloadLimit:30}});
 await db.product.upsert({where:{slug:"pack-social-media-pro"},update:{},create:{creatorId:creator.id,categoryId:cat.id,name:"Pack Social Media Pro",slug:"pack-social-media-pro",description:"Recurso demo de RCKTDMG.",price:49,accessType:AccessType.BOTH,status:ProductStatus.PUBLISHED}});
}
main().finally(()=>db.$disconnect());