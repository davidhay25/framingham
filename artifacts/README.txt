
//Backup local mongo db

mongodump --db {dbname} --out {path-to-localfolder}



//Copy mongo backup folder from remote host to local machine

scp -r root@snapp.clinfhir.com:/root/mongoback/cofio ~/mongoback


//restore backup into local db

mongorestore --db {dbname} --dir {path-to-backup


//------ general docs

SCP samples
http://www.hypexr.org/linux_scp_help.php