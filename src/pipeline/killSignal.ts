import Docker from 'dockerode';

/* Set docker socket connexion */

const dockerSocket = new Docker({socketPath: '/var/run/docker.sock'});

const send = async () => {
    const imageName = process.env.KILL_IMAGE_NAME || '';
    const killSignal = process.env.KILL_SIGNAL || '';

    if(imageName === ''){
      console.log('No image name provided to send kill signal, no signal will be send.')
      return;
    }
    if(killSignal === ''){
      console.log('No kill signal type provided, no signal will be send.')
      return;
    }

    /* Retrieve container ID */

    let containerID = '';

    const listContainer = await dockerSocket.listContainers();

    listContainer.forEach((containerInfo: any) => {
      if(containerInfo.Image === imageName){
        containerID = containerInfo.Id;
        return;
      }
    });

    const container = dockerSocket.getContainer(containerID);

    if(containerID === ''){ // Next version will allow to test if container exist: https://github.com/apocas/dockerode/pull/585/commits/f78bd577e8d8faf40dc243189142f2dde3fc073c
      console.log('No container is running with this image name.')
      return;
    }

    /* Send kill signal */

    container.kill({ signal: killSignal });
  }

  export{
      send
  }
