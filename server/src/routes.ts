import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from "./lib/prisma"

export async function appRoutes(app: FastifyInstance) {
  
  
  // dayjs.tz.setDefault('Africa/Maputo')
  
  const createHabitBody = z.object({
    title: z.string(),
    weekDays: z.array(
      z.number().min(0).max(6))
  })
  
  app.post('/habits', async (req) => {
    
    const { title, weekDays } = createHabitBody.parse(req.body)
    
     
    const today = dayjs().startOf('day').add(2, 'hours').toDate()

  
    
    await prisma.habit.create({
      data: {
        title,
        created_at: today,
        weekDays: {
          create: weekDays.map(weekDay => {
            return ({
              week_day: weekDay
            })
          })
        }
        }
    })

  })

  app.get('/day',async (request) => {
    const getDayParams = z.object({
        date: z.coerce.date()
    })

    const {date} = getDayParams.parse(request.query)

    const parsedDate = dayjs(date).startOf('day').add(2, 'hours')

    const weekDay = parsedDate.get('day')

    console.log(date, parsedDate.toDate())

    // todos os hábitos possíveis
    // hábitos que já foram completados

    const possibleHabits = await prisma.habit.findMany({
        where:{
            created_at:{
                lte: parsedDate.toDate(),
            },
            weekDays:{
                some:{
                    week_day: weekDay,
                }
            }
        }
    })

    const day = await prisma.day.findUnique({
        where:{
            date: parsedDate.toDate(),
        },
        include:{
            dayHabits: true,
        }
    })

    const completedHabits = day?.dayHabits.map(dayHabit =>{
        return dayHabit.habit_id
    })



    return{
        possibleHabits,
        completedHabits
    }
  })

  //completar ou descompletar um hábito

  app.patch('/habits/:id/toggle', async (request) => {
    const toggleHabitParams = z.object({
      id: z.string().uuid()
    })

    const { id } = toggleHabitParams.parse(request.params)
  
    const today = dayjs().startOf('day').add(2, 'hours').toDate()

    let day = await prisma.day.findUnique({
      where: {
        date:today,
      }
    })

    if (!day) {
      day = await prisma.day.create({
        data: {
          date:today,
        }
      })
    }

    const dayHabit = await prisma.dayHabit.findUnique({
      where:{
        day_id_habit_id: {
          day_id: day.id,
          habit_id:id
        }
      }
    })

    if (dayHabit) {
      await prisma.dayHabit.delete({
        where: {
          id: dayHabit.id,
          
        }
      })    
    } else {
      await prisma.dayHabit.create({
        data: {
          day_id: day.id,
          habit_id: id
        }
      })
    }

  })
}