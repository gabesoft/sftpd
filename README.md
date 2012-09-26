# A simple cli tool to deploy files via sftp

Only file watch & sync are currently implemented.

To watch files in a directory and deploy on change 
cd into the local directory to be watched and call:

> sftpd watch ftpuser myhost /myremotedir localdir1,localdir2

or to watch all files in the current directory:

> sftpd watch ftpuser myhost /myremotedir .

Similarly to sync files from a directory
cd into the local directory (which will be considered the base local directory) and call:

> sftpd sync ftpuser myhost /myremotedir localdir1,localdir2
