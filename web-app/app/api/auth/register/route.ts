import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    if (!email || !password) {
      return new NextResponse("Missing fields", { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: email
      }
    })

    if (existingUser) {
      return new NextResponse("Email already exists", { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.log(error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}