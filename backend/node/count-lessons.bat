@echo off
echo Counting lessons in the database...
mysql -u Sara -pSara0330!! aischool -e "SELECT COUNT(*) AS total_lessons FROM lessons;"
echo Done. 