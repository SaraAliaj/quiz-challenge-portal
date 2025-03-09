@echo off
echo Deleting all lessons with IDs greater than or equal to 3...
mysql -u Sara -pSara0330!! aischool -e "DELETE FROM lessons WHERE id >= 3;"
echo Done. 