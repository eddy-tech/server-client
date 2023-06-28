import { Injectable } from '@angular/core';
import { NotifierService } from 'angular-notifier'
import {Type} from '../enum/status.enum';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly notifier?: NotifierService

  constructor(private notifierService: NotifierService){
    this.notifier = this.notifierService
  }

  onDefault = (message: string) => this.notifier?.notify(Type.DEFAULT, message);
  onSuccess = (message: string) => this.notifier?.notify(Type.SUCCESS, message);
  onInfo = (message: string) => this.notifier?.notify(Type.INFO, message);
  onWarning = (message: string) => this.notifier?.notify(Type.WARNING, message);
  onError = (message: string) => this.notifier?.notify(Type.ERROR, message);
}

