from os import path

import raven
from bs4 import BeautifulSoup

base_url = 'http://to.eng.cam.ac.uk/teaching/past_papers/part1a/'

r = raven.get_url(base_url).text

soup = BeautifulSoup(r)
table = soup.find_all('table')[4]

for a in table.find_all('a'):
	href = a['href']
	fname = path.join('pdfs', path.basename(href))
	with open(fname, 'wb') as f:
		r = raven.get_url(base_url + href, stream=True)
		if r.status_code == 200:
			for chunk in r.iter_content(1024):
				f.write(chunk)
		else:
			print "Getting", fname, "failed"