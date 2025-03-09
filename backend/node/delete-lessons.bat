@echo off
echo Deleting lessons with IDs between 3 and 500...
mysql -u Sara -pSara0330!! aischool -e "DELETE FROM lessons WHERE id BETWEEN 3 AND 500;"
echo Done. 