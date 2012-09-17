A simple cli tool to deploy files via sftp.
Only file watch is currently implemented.

To watch files in a directory and deploy on change 
cd into the local directory to be watched and call:

sftpd watch ftpuser myhost /myremotedir localdir1,localdir2

or to watch all files in the current directory:

sftpd watch ftpuser myhost /myremotedir .
