import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "@core/db/triMongo";
import { coreCol, piiCol } from "@core/db/db/triMongo";
import { hashPassword } from "@/utils/password";
import { applySessionCookies, CREDENTIAL_COLLECTION, issueTwoFactorChallenge, resolveAvailableTwoFactorMethods, resolveTwoFactorMethod, sanitizeRedirect, type CoreUserAuthSnapshot, type PiiUserCredentials } from "../sharedAuth";
import { mailLocaleFromUser } from "@/utils/mailRenderer";
import { verifyVogEdebatteHandoff, sanitizeVogHandoffNext } from "@/lib/auth/vogEdebatteHandoff";
export const runtime="nodejs"; export const dynamic="force-dynamic";
type HandoffReplay={_id?:ObjectId;jtiHash:string;createdAt:Date;expiresAt:Date};
function hashJti(jti:string){return crypto.createHash("sha256").update(jti).digest("hex");}
function edebatteOrigin(){return (process.env.PUBLIC_BASE_URL||"https://www.edebatte.org").replace(/\/$/,"");}
export async function GET(req:NextRequest){
 const token=req.nextUrl.searchParams.get("token")?.trim(); if(!token)return NextResponse.redirect(new URL("/login?error=sso_invalid",req.url),303);
 const next=sanitizeVogHandoffNext(req.nextUrl.searchParams.get("next")); let assertion:ReturnType<typeof verifyVogEdebatteHandoff>;
 try{assertion=verifyVogEdebatteHandoff(token);}catch{return NextResponse.redirect(new URL("/login?error=sso_invalid&next="+encodeURIComponent(next),req.url),303);}
 const replay=await coreCol<HandoffReplay>("auth_vog_handoff_replay"); await replay.createIndex({jtiHash:1},{unique:true}).catch(()=>{}); await replay.createIndex({expiresAt:1},{expireAfterSeconds:0}).catch(()=>{});
 try{await replay.insertOne({jtiHash:hashJti(assertion.jti),createdAt:new Date(),expiresAt:new Date(assertion.exp*1000)});}catch{return NextResponse.redirect(new URL("/login?error=sso_replayed&next="+encodeURIComponent(next),req.url),303);}
 const email=assertion.email.trim().toLowerCase(); const users=await coreCol<CoreUserAuthSnapshot & {passwordHash?:string}>("users"); let user=await users.findOne({"profile.vogMemberId":assertion.sub}); if(!user)user=await users.findOne({email});
 if(!user){const now=new Date(); const passwordHash=await hashPassword(crypto.randomBytes(48).toString("base64url")); const insert=await users.insertOne({email,name:assertion.name,role:"user",roles:["user"],verifiedEmail:true,emailVerified:true,accessTier:"citizenBasic",profile:{displayName:assertion.name,vogMemberId:assertion.sub},verification:{level:"email",methods:["vog_sso"],lastVerifiedAt:now},createdAt:now,updatedAt:now} as any); const credentials=await piiCol<PiiUserCredentials>(CREDENTIAL_COLLECTION); await credentials.updateOne({coreUserId:insert.insertedId},{$setOnInsert:{coreUserId:insert.insertedId,email,passwordHash,twoFactorEnabled:false,createdAt:now,updatedAt:now}},{upsert:true}); user=await users.findOne({_id:insert.insertedId});}
 else if(!user.profile?.vogMemberId){await users.updateOne({_id:user._id},{$set:{"profile.vogMemberId":assertion.sub,updatedAt:new Date()}});user=await users.findOne({_id:user._id});}
 if(!user?._id)return NextResponse.redirect(new URL("/login?error=sso_account_failed&next="+encodeURIComponent(next),req.url),303);
 const credentials=await piiCol<PiiUserCredentials>(CREDENTIAL_COLLECTION).then(col=>col.findOne({coreUserId:user!._id})); const twoFactorMethod=resolveTwoFactorMethod(credentials,user);
 if(Boolean(credentials?.twoFactorEnabled||user.verification?.twoFA?.enabled)&&twoFactorMethod){const methods=resolveAvailableTwoFactorMethods(credentials,user);const challenge=await issueTwoFactorChallenge({userId:user._id,method:twoFactorMethod,emailForCode:credentials?.email||user.email||email,purpose:"login_verify",redirectTo:sanitizeRedirect(next),locale:mailLocaleFromUser(user)});if(!challenge.ok)return NextResponse.redirect(new URL("/login?error=sso_2fa_delivery&next="+encodeURIComponent(next),req.url),303);const target=new URL("/login",edebatteOrigin());target.searchParams.set("step","twofactor");target.searchParams.set("method",twoFactorMethod);target.searchParams.set("next",sanitizeRedirect(next));target.searchParams.set("sso","1");target.searchParams.set("methods",methods.join(","));return NextResponse.redirect(target,303);}
 await applySessionCookies(user); const response=NextResponse.redirect(new URL(sanitizeRedirect(next),edebatteOrigin()),303); response.headers.set("Cache-Control","no-store");response.headers.set("Referrer-Policy","no-referrer");return response;
}
