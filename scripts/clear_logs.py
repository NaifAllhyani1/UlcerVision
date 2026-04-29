import sqlite3
conn = sqlite3.connect('d:/gdp2/database/dfu_predict.db')
c = conn.cursor()
c.execute('DELETE FROM notifications')
c.execute('DELETE FROM scan_results')
c.execute('DELETE FROM scans')
conn.commit()
print('Logs cleared successfully')
conn.close()
