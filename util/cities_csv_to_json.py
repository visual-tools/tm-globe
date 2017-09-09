#!/usr/bin/python
import sys
import csv

if __name__ == '__main__':
	if len(sys.argv) < 2:
		print('Please provide the path of a CSV file to parse')
		sys.exit(1)
	
	with open(sys.argv[1], 'r') as cityFile:
		cityData = csv.reader(cityFile, delimiter=',')
		outStr = '['
		cityData.next()
		for row in cityData:
			cityJSON = '{{"name":"{0}","coordinates":[{1},{2}],"mediaType":"{3}","media":"{5}"}}'.format(*row)
			outStr += cityJSON
			outStr += ','
		outStr = outStr[0:-1] + ']'
	print(outStr)
