import PocketBase from 'pocketbase';

const pb = new PocketBase('http://162.35.174.185:8090');
pb.autoCancellation(false);

export default pb;