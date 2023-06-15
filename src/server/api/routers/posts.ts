import { Prisma } from "@prisma/client";
import { inferAsyncReturnType } from "@trpc/server";
import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  createTRPCContext,
} from "~/server/api/trpc";

export const postRouter = createTRPCRouter({
  infiniteProfileFeed: publicProcedure.input
(z.object({ 
 userId: z.string(),
 limit: z.number().optional(),
 cursor: z.object({id: z.string(), createdAt: z.date()}).optional(),
 })
 ).query(async ({input: {limit = 29, userId , cursor}, ctx}) => 
 { 
  const currentUserId = ctx.session?.user.id
  return await getInfinitePosts({
  limit, ctx,cursor, 
  whereClause:  { userId }
  })
   }
 ),
  infiniteFeed: publicProcedure.input
(z.object({ 
 onlyFollowing: z.boolean().optional(),
 limit: z.number().optional(),
 cursor: z.object({id: z.string(), createdAt: z.date()}).optional(),
 })
 ).query(async ({input: {limit = 29, onlyFollowing = false , cursor}, ctx}) => 
 { 
  const currentUserId = ctx.session?.user.id
  return await getInfinitePosts({
  limit, ctx,cursor, whereClause: currentUserId == null || !onlyFollowing ? undefined 
  :{
    user: {
      followers: {some: {id : currentUserId}}
    }
  }
   })
   }
 ),
   
    create: protectedProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ input: { content }, ctx}) => {
    const post = await ctx.prisma.message.create({
        data: {content, userId: ctx.session.user.id},
      });

              void ctx.revalidateSSG?.(`profiles/${ctx.session.user.id}`)


      return post;
    }),
    toggleLike: protectedProcedure.input(z.object({id: z.string() }))
    .mutation(
      async ({input: {id}, ctx}) => {
          const data = { messageId: id, userId: ctx.session.user.id}
          const existingLike = await ctx.prisma.like.findUnique({
            where: { userId_messageId: data}
          })
          if(existingLike == null){
              await ctx.prisma.like.create({data})
              return {addedLike: true}
          }else {
            await ctx.prisma.like.delete({ where:{ userId_messageId: data}})
            return {addedLike: false}    
          }
      })
});

async function getInfinitePosts({
  whereClause,
  ctx, limit, cursor
}: {whereClause?: Prisma.MessageWhereInput, limit: number, cursor: { id: string, createdAt: Date } | undefined, ctx: inferAsyncReturnType<typeof createTRPCContext>}) {
    const currentUserId = ctx.session?.user.id
  
    const data = await ctx.prisma.message.findMany({
    take: limit + 1,
    cursor: cursor ? {createdAt_id: cursor} : undefined,
    where: whereClause,
    orderBy: [{createdAt: "desc"}, {id: "desc"}],
    select: {
      id: true,
      content: true,
      createdAt: true,
      _count: { select: { likes: true}},
      likes: currentUserId === null ? false : { where: {
        userId: currentUserId
      }},
      user: {
        select:{ name: true , id: true, image: true}
      }
    }
  })
  let nextCursor: typeof cursor | undefined 
  if(data.length > limit){
   const nextItem = data.pop()
   if(nextItem != null)
    nextCursor = {id: nextItem.id, createdAt: nextItem.createdAt }
  }
  return {posts: data.map(post => { 
    return {
      id: post.id,
      content: post.content,
      createdAt: post.createdAt,
      likeCount: post._count.likes,
      user: post.user,
      likedByMe: post.likes?.length > 0.
    }
    }),
    nextCursor,
   }
}