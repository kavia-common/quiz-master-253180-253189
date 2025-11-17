#!/bin/bash
cd /home/kavia/workspace/code-generation/quiz-master-253180-253189/quiz_application_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

