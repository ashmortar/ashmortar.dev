-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriviaGame" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "triviaCategoryId" TEXT,
    "currentQuestion" INTEGER NOT NULL DEFAULT 0,
    "apiToken" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "TriviaGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayersInTriviaGames" (
    "playerId" TEXT NOT NULL,
    "triviaGameId" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL,
    "score" INTEGER NOT NULL,
    "won" BOOLEAN NOT NULL,

    CONSTRAINT "PlayersInTriviaGames_pkey" PRIMARY KEY ("playerId","triviaGameId")
);

-- CreateTable
CREATE TABLE "PlayersInTriviaGamesAnswers" (
    "playerId" TEXT NOT NULL,
    "triviaGameId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,

    CONSTRAINT "PlayersInTriviaGamesAnswers_pkey" PRIMARY KEY ("playerId","triviaGameId","position")
);

-- CreateTable
CREATE TABLE "TriviaCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiId" INTEGER NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "easyQuestions" INTEGER NOT NULL,
    "mediumQuestions" INTEGER NOT NULL,
    "hardQuestions" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "available" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TriviaCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "position" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "triviaGameId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "incorrectAnswers" TEXT[],
    "type" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "correctIndex" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Question_pkey" PRIMARY KEY ("position","triviaGameId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_username_key" ON "Player"("username");

-- CreateIndex
CREATE UNIQUE INDEX "TriviaGame_slug_key" ON "TriviaGame"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TriviaCategory_name_key" ON "TriviaCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TriviaCategory_apiId_key" ON "TriviaCategory"("apiId");

-- AddForeignKey
ALTER TABLE "TriviaGame" ADD CONSTRAINT "TriviaGame_triviaCategoryId_fkey" FOREIGN KEY ("triviaCategoryId") REFERENCES "TriviaCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayersInTriviaGames" ADD CONSTRAINT "PlayersInTriviaGames_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayersInTriviaGames" ADD CONSTRAINT "PlayersInTriviaGames_triviaGameId_fkey" FOREIGN KEY ("triviaGameId") REFERENCES "TriviaGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayersInTriviaGamesAnswers" ADD CONSTRAINT "PlayersInTriviaGamesAnswers_playerId_triviaGameId_fkey" FOREIGN KEY ("playerId", "triviaGameId") REFERENCES "PlayersInTriviaGames"("playerId", "triviaGameId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayersInTriviaGamesAnswers" ADD CONSTRAINT "PlayersInTriviaGamesAnswers_position_triviaGameId_fkey" FOREIGN KEY ("position", "triviaGameId") REFERENCES "Question"("position", "triviaGameId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TriviaCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_triviaGameId_fkey" FOREIGN KEY ("triviaGameId") REFERENCES "TriviaGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
