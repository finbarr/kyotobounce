// Continuous input is replaceable; discrete commands retain their order.
// A slow native request must not turn 30 Hz movement into an abusive backlog.
export class ConnectionQueue {
  private items:any[]=[];
  private running=false;
  private closed=false;
  private handle:(message:any)=>Promise<void>;
  constructor(handle:(message:any)=>Promise<void>){this.handle=handle;}
  get pending(){return this.items.length+Number(this.running);}
  push(message:any){
    if(this.closed)return false;
    if(message.type==='input'&&this.items.at(-1)?.type==='input'){
      this.items[this.items.length-1]=message;return true;
    }
    if(this.pending>=64)return false;
    this.items.push(message);void this.drain();return true;
  }
  close(){this.closed=true;this.items.length=0;}
  private async drain(){
    if(this.running)return;this.running=true;
    try{while(!this.closed&&this.items.length)await this.handle(this.items.shift());}
    finally{this.running=false;}
  }
}
